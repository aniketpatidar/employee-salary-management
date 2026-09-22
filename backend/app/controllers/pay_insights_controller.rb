class PayInsightsController < ApplicationController
  BREAKDOWN_FIELDS = %w[department country role].freeze
  FILTER_FIELDS = %i[department country role employment_type status].freeze
  DEFAULT_STATUS = "active"

  def index
    return render_invalid_breakdown unless BREAKDOWN_FIELDS.include?(params[:breakdown])

    invalid_field = first_invalid_filter
    return render_invalid_filter(invalid_field) if invalid_field

    render json: { groups: Employee.pay_insights(filter_params, params[:breakdown]) }
  end

  private
    def filter_params
      FILTER_FIELDS.index_with { |field| field == :status ? status_param : params[field] }
    end

    def status_param
      params[:status].presence || DEFAULT_STATUS
    end

    def first_invalid_filter
      FILTER_FIELDS.find { |field| invalid_filter_value?(field) }
    end

    def invalid_filter_value?(field)
      value = field == :status ? status_param : params[field]
      value.present? && !allowed_values(field).include?(value)
    end

    def allowed_values(field)
      Employee.public_send(field.to_s.pluralize).keys
    end

    def render_invalid_filter(field)
      render json: { error: "Invalid #{field} filter value" }, status: :unprocessable_entity
    end

    def render_invalid_breakdown
      render json: { error: "Invalid breakdown value" }, status: :unprocessable_entity
    end
end
