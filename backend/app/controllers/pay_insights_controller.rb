class PayInsightsController < ApplicationController
  include EmployeeFilterParams

  def index
    return render_invalid_breakdown unless Employee::PAY_INSIGHT_BREAKDOWNS.include?(params[:breakdown])

    invalid_field = first_invalid_filter
    return render_invalid_filter(invalid_field) if invalid_field

    render json: { groups: Employee.pay_insights(filter_params, params[:breakdown]) }
  end

  private
    def render_invalid_breakdown
      render json: { error: "Invalid breakdown value" }, status: :unprocessable_content
    end
end
