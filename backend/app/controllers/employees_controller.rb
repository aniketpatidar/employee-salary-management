class EmployeesController < ApplicationController
  def index
    render json: { message: "Employee list/search/filter arrives in Slice 2" }, status: :ok
  end
end
