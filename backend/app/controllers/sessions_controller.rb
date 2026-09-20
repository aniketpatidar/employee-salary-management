class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[create]
  rate_limit to: 10, within: 3.minutes, only: :create, with: -> { render json: { error: "Try again later" }, status: :too_many_requests }

  def show
    render json: { user: { email_address: Current.user.email_address } }, status: :ok
  end

  def create
    if user = User.authenticate_by(params.permit(:email_address, :password))
      start_new_session_for user
      render json: { user: { email_address: user.email_address } }, status: :ok
    else
      render json: { error: "Invalid email or password" }, status: :unauthorized
    end
  end

  def destroy
    terminate_session
    head :ok
  end
end
