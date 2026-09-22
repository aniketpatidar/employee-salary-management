module EmployeeRendering
  private
    def employee_detail_json(employee)
      employee.as_json(
        only: %i[
          id full_name department role country currency base_salary
          employment_type pay_frequency hire_date status manager_id
        ]
      ).merge(manager: manager_summary(employee.manager))
    end

    def manager_summary(manager)
      manager&.as_json(only: %i[id full_name])
    end

    def render_errors(employee)
      render json: { errors: employee.errors.messages }, status: :unprocessable_content
    end
end
