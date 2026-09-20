class HealthChecksController < ApplicationController
  def show
    render json: { status: "ok", service: "employee-salary-management-api" }
  end
end
