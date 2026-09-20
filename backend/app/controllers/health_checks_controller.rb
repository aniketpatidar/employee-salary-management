class HealthChecksController < ApplicationController
  allow_unauthenticated_access

  def show
    render json: { status: "ok", service: "employee-salary-management-api" }
  end
end
