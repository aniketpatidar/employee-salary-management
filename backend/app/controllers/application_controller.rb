class ApplicationController < ActionController::API
  include ActionController::Cookies
  include Authentication

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

  private
    def render_not_found(exception)
      render json: { error: "#{exception.model} not found" }, status: :not_found
    end
end
