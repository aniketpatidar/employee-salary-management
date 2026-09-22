module EmployeeFilterParams
  FILTER_FIELDS = Employee::FILTER_FIELDS
  DEFAULT_STATUS = "active"

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
      render json: { error: "Invalid #{field} filter value" }, status: :unprocessable_content
    end
end
