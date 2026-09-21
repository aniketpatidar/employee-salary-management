class EmployeesController < ApplicationController
  FILTER_FIELDS = %i[department country role employment_type status].freeze
  DEFAULT_STATUS = "active"
  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100

  def index
    invalid_field = first_invalid_filter
    return render_invalid_filter(invalid_field) if invalid_field

    scope = filtered_employees.order(:id)
    page, per_page = pagination_params

    render json: {
      employees: paginated_employees(scope, page, per_page),
      page: page,
      per_page: per_page,
      total_count: scope.count
    }
  end

  def filters
    render json: FILTER_FIELDS.index_with { |field| allowed_values(field) }
  end

  private
    def filtered_employees
      Employee
        .by_department(params[:department])
        .by_country(params[:country])
        .by_role(params[:role])
        .by_employment_type(params[:employment_type])
        .by_status(status_param)
    end

    def status_param
      params[:status].presence || DEFAULT_STATUS
    end

    def paginated_employees(scope, page, per_page)
      scope.limit(per_page).offset((page - 1) * per_page).map { |employee| employee_summary(employee) }
    end

    def employee_summary(employee)
      employee.as_json(only: %i[id full_name department role country employment_type status])
    end

    def pagination_params
      page = [ params[:page].to_i, 1 ].max
      per_page = params[:per_page].to_i
      per_page = DEFAULT_PER_PAGE if per_page < 1
      per_page = MAX_PER_PAGE if per_page > MAX_PER_PAGE
      [ page, per_page ]
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
end
