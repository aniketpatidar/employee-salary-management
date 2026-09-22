class EmployeeSeeder
  FIRST_NAMES = %w[
    James Mary Robert Patricia John Jennifer Michael Linda William Elizabeth
    David Barbara Richard Susan Joseph Jessica Thomas Sarah Charles Karen
    Priya Wei Hiroshi Fatima Carlos Ingrid Liam Noah Olivia Emma
    Ananya Chen Yuki Mateus Sven Amara Diego Freya Arjun Lucia
  ].freeze

  LAST_NAMES = %w[
    Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez
    Hernandez Lopez Gonzalez Wilson Anderson Thomas Taylor Moore Jackson Martin
    Patel Kumar Sato Tanaka Silva Muller Schmidt Dubois Nakamura Costa
    Chen Wang Singh Khan Andersson Larsen Rossi Ferreira Souza Meyer
  ].freeze

  MANAGER_ROLES = %w[engineering_manager sales_manager operations_manager executive product_manager].freeze

  CURRENCY_SALARY_RANGES = {
    "usd" => 50_000..200_000,
    "cad" => 55_000..180_000,
    "gbp" => 35_000..140_000,
    "eur" => 40_000..150_000,
    "aud" => 70_000..200_000,
    "sgd" => 50_000..220_000,
    "brl" => 60_000..400_000,
    "inr" => 400_000..5_000_000,
    "jpy" => 4_000_000..20_000_000
  }.freeze

  DEFAULT_INACTIVE_RATE = 0.1
  DEFAULT_CONTRACTOR_RATE = 0.2
  DEFAULT_NO_MANAGER_RATE = 0.15

  def initialize(total: 10_000, inactive_rate: DEFAULT_INACTIVE_RATE, contractor_rate: DEFAULT_CONTRACTOR_RATE,
                 no_manager_rate: DEFAULT_NO_MANAGER_RATE, random: Random.new)
    @total = total
    @inactive_rate = inactive_rate
    @contractor_rate = contractor_rate
    @no_manager_rate = no_manager_rate
    @random = random
  end

  def build_records
    records = Array.new(@total) { |index| build_record(index + 1) }
    assign_managers(records)
    records
  end

  def call
    records = build_records

    reset_employees_table

    records.each_slice(1_000) do |batch|
      Employee.insert_all(batch)
    end

    records
  end

  private
    def reset_employees_table
      ActiveRecord::Base.connection.execute("PRAGMA foreign_keys = OFF")
      Employee.delete_all
      ActiveRecord::Base.connection.execute("DELETE FROM sqlite_sequence WHERE name = 'employees'")
      ActiveRecord::Base.connection.execute("PRAGMA foreign_keys = ON")
    end

    def build_record(id)
      department = departments.sample(random: @random)
      role = roles.sample(random: @random)
      country = countries.sample(random: @random)
      currency = Employee::COUNTRY_CURRENCY_MAP.fetch(country)

      {
        id: id,
        full_name: "#{FIRST_NAMES.sample(random: @random)} #{LAST_NAMES.sample(random: @random)}",
        department: Employee.departments.fetch(department),
        role: Employee.roles.fetch(role),
        country: Employee.countries.fetch(country),
        currency: Employee.currencies.fetch(currency),
        base_salary: random_base_salary(currency),
        employment_type: Employee.employment_types.fetch(random_employment_type),
        pay_frequency: Employee.pay_frequencies.fetch(pay_frequencies.sample(random: @random)),
        manager_id: nil,
        hire_date: random_hire_date,
        status: Employee.statuses.fetch(random_status),
        department_name: department,
        role_name: role,
        created_at: Time.current,
        updated_at: Time.current
      }
    end

    def random_employment_type
      @random.rand < @contractor_rate ? "contractor" : "full_time"
    end

    def random_status
      @random.rand < @inactive_rate ? "inactive" : "active"
    end

    def assign_managers(records)
      pools = manager_pools_by_department(records)
      records.each { |record| assign_manager(record, pools) }
      strip_helper_keys(records)
    end

    def manager_pools_by_department(records)
      pools = Hash.new { |hash, key| hash[key] = [] }

      records.each do |record|
        next unless MANAGER_ROLES.include?(record[:role_name])
        next unless Employee.statuses.key(record[:status]) == "active"

        pools[record[:department_name]] << record[:id]
      end

      pools
    end

    def assign_manager(record, pools)
      return if @random.rand < @no_manager_rate

      candidates = pools[record[:department_name]].select { |manager_id| manager_id < record[:id] }
      record[:manager_id] = candidates.sample(random: @random) if candidates.any?
    end

    def strip_helper_keys(records)
      records.each do |record|
        record.delete(:department_name)
        record.delete(:role_name)
      end
    end

    def random_hire_date
      Date.current - @random.rand(0..3652)
    end

    def random_base_salary(currency)
      range = CURRENCY_SALARY_RANGES.fetch(currency)
      @random.rand(range) + @random.rand(0..99) / 100.0
    end

    def departments
      @departments ||= Employee.departments.keys
    end

    def roles
      @roles ||= Employee.roles.keys
    end

    def countries
      @countries ||= Employee.countries.keys
    end

    def pay_frequencies
      @pay_frequencies ||= Employee.pay_frequencies.keys
    end
end
