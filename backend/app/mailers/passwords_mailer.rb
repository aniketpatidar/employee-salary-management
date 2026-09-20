class PasswordsMailer < ApplicationMailer
  def reset(user)
    @user = user
    @reset_url = "#{frontend_origin}/passwords/#{user.password_reset_token}/edit"
    mail subject: "Reset your password", to: user.email_address
  end

  private
    def frontend_origin
      ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")
    end
end
