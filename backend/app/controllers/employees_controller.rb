class EmployeesController < ApplicationController
  include EmployeeFilterParams
  include EmployeeRendering

  EMPLOYEE_PARAMS = %i[
    full_name department role country base_salary
    employment_type pay_frequency hire_date manager_id
  ].freeze
  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100
  MANAGER_OPTIONS_LIMIT = 10

  def index
    invalid_field = first_invalid_filter
    return render_invalid_filter(invalid_field) if invalid_field

    scope = Employee.filtered(filter_params).order(:id)
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
      .merge(country_currency: Employee::COUNTRY_CURRENCY_MAP)
  end

  def show
    render json: { employee: employee_detail_json(Employee.find(params[:id])) }
  end

  def create
    employee = Employee.new(employee_params)

    if employee.save
      render json: { employee: employee_detail_json(employee) }, status: :created
    else
      render_errors(employee)
    end
  end

  def update
    employee = Employee.find(params[:id])

    if employee.update(employee_params)
      render json: { employee: employee_detail_json(employee) }
    else
      render_errors(employee)
    end
  end

  def manager_options
    employees = Employee.active
      .name_matches(params[:q])
      .excluding_id(params[:exclude_id])
      .order(:full_name)
      .limit(MANAGER_OPTIONS_LIMIT)

    render json: employees.as_json(only: %i[id full_name department role])
  end

  private
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

    def employee_params
      params.permit(EMPLOYEE_PARAMS)
    end
end
