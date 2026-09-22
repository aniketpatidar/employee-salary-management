class Employee < ApplicationRecord
  enum :department, {
    engineering: 0,
    sales: 1,
    marketing: 2,
    finance: 3,
    human_resources: 4,
    operations: 5,
    customer_support: 6,
    legal: 7,
    product: 8,
    design: 9
  }, validate: true

  enum :role, {
    software_engineer: 0,
    engineering_manager: 1,
    account_executive: 2,
    sales_manager: 3,
    marketing_specialist: 4,
    financial_analyst: 5,
    hr_business_partner: 6,
    operations_manager: 7,
    support_specialist: 8,
    product_manager: 9,
    designer: 10,
    legal_counsel: 11,
    executive: 12
  }, validate: true

  enum :country, {
    united_states: 0,
    canada: 1,
    united_kingdom: 2,
    germany: 3,
    france: 4,
    india: 5,
    australia: 6,
    japan: 7,
    brazil: 8,
    singapore: 9
  }, validate: true

  enum :currency, {
    usd: 0,
    cad: 1,
    gbp: 2,
    eur: 3,
    inr: 4,
    aud: 5,
    jpy: 6,
    brl: 7,
    sgd: 8
  }, validate: true

  enum :employment_type, { full_time: 0, contractor: 1 }, validate: true
  enum :pay_frequency, { monthly: 0, annual: 1 }, validate: true
  enum :status, { active: 0, inactive: 1 }, validate: true

  COUNTRY_CURRENCY_MAP = {
    "united_states" => "usd",
    "canada" => "cad",
    "united_kingdom" => "gbp",
    "germany" => "eur",
    "france" => "eur",
    "india" => "inr",
    "australia" => "aud",
    "japan" => "jpy",
    "brazil" => "brl",
    "singapore" => "sgd"
  }.freeze

  belongs_to :manager, class_name: "Employee", optional: true
  has_many :direct_reports, class_name: "Employee", foreign_key: :manager_id, inverse_of: :manager, dependent: :nullify

  scope :name_matches, ->(query) { where("full_name LIKE ? ESCAPE '\\'", "%#{sanitize_sql_like(query)}%") if query.present? }
  scope :excluding_id, ->(id) { where.not(id: id) if id.present? }

  FILTER_FIELDS = %i[department country role employment_type status].freeze
  PAY_INSIGHT_BREAKDOWNS = %w[department country role].freeze

  def self.filtered(filters)
    where(filters.to_h.symbolize_keys.slice(*FILTER_FIELDS).compact_blank)
  end

  def self.pay_insights(filters, breakdown)
    raise ArgumentError, "invalid breakdown: #{breakdown}" unless PAY_INSIGHT_BREAKDOWNS.include?(breakdown)

    column = breakdown
    scope = filtered(filters)

    merge_pay_insights(pay_insights_averages(scope, column), pay_insights_medians(scope, column), column)
  end

  def self.pay_insights_averages(scope, column)
    scope
      .group(column, :currency)
      .pluck(column, :currency, Arel.sql("ROUND(AVG(base_salary), 2)"), Arel.sql("COUNT(*)"))
  end
  private_class_method :pay_insights_averages

  def self.pay_insights_medians(scope, column)
    filtered_sql = scope.select("#{column} AS group_value", :currency, :base_salary).to_sql

    sql = <<~SQL
      WITH filtered AS (#{filtered_sql}),
      ranked AS (
        SELECT
          group_value,
          currency,
          base_salary,
          ROW_NUMBER() OVER (PARTITION BY group_value, currency ORDER BY base_salary) AS rn,
          COUNT(*) OVER (PARTITION BY group_value, currency) AS cnt
        FROM filtered
      )
      SELECT group_value, currency, ROUND(AVG(base_salary), 2) AS median
      FROM ranked
      WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2) -- middle row(s); collapses to one when cnt is odd
      GROUP BY group_value, currency
    SQL

    connection.select_all(sql).to_a
  end
  private_class_method :pay_insights_medians

  def self.merge_pay_insights(averages, medians, column)
    medians_by_key = medians.index_by do |row|
      [ public_send(column.pluralize).key(row["group_value"]), currencies.key(row["currency"]) ]
    end

    averages.map do |group_value, currency, average, count|
      {
        group: group_value,
        currency: currency,
        average: average.to_f,
        median: medians_by_key.fetch([ group_value, currency ])["median"].to_f,
        count: count
      }
    end.sort_by { |row| [ row[:group], row[:currency] ] }
  end
  private_class_method :merge_pay_insights

  validates :full_name, presence: true
  validates :base_salary, presence: true, numericality: { greater_than: 0 }
  validates :hire_date, presence: true
  validate :hire_date_not_in_future
  validate :manager_must_be_active_and_not_self, if: -> { manager_id.present? && will_save_change_to_manager_id? }

  before_validation :derive_currency_from_country

  def deactivate = update(status: :inactive)

  private
    def derive_currency_from_country
      self.currency = COUNTRY_CURRENCY_MAP[country] if country.present?
    end

    def hire_date_not_in_future
      return if hire_date.blank?

      errors.add(:hire_date, "can't be in the future") if hire_date > Date.current
    end

    def manager_must_be_active_and_not_self
      if manager_id == id
        errors.add(:manager_id, "can't be the employee's own manager")
      elsif !Employee.active.exists?(id: manager_id)
        errors.add(:manager_id, "must be an active employee")
      end
    end
end
