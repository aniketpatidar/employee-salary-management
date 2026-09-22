module Employees
  class DeactivationsController < ApplicationController
    include EmployeeRendering

    def create
      employee = Employee.find(params[:employee_id])

      if employee.deactivate
        render json: { employee: employee_detail_json(employee) }
      else
        render_errors(employee)
      end
    end
  end
end
