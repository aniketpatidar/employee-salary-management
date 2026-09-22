module Employee::PayInsights
  extend ActiveSupport::Concern

  PAY_INSIGHT_BREAKDOWNS = %w[department country role].freeze

  class_methods do
    def pay_insights(filters, breakdown)
      raise ArgumentError, "invalid breakdown: #{breakdown}" unless PAY_INSIGHT_BREAKDOWNS.include?(breakdown)

      column = breakdown
      scope = filtered(filters)

      merge_pay_insights(pay_insights_averages(scope, column), pay_insights_medians(scope, column), column)
    end

    private
      def pay_insights_averages(scope, column)
        scope
          .group(column, :currency)
          .pluck(column, :currency, Arel.sql("ROUND(AVG(base_salary), 2)"), Arel.sql("COUNT(*)"))
      end

      def pay_insights_medians(scope, column)
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

      def merge_pay_insights(averages, medians, column)
        medians_by_key = median_lookup(medians, column)

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

      def median_lookup(medians, column)
        medians.index_by do |row|
          [ public_send(column.pluralize).key(row["group_value"]), currencies.key(row["currency"]) ]
        end
      end
  end
end
