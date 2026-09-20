require "test_helper"

class PasswordsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  def create_user(email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024")
    User.create!(email_address: email_address, password: password, password_confirmation: password)
  end

  test "requesting a reset for an existing email returns the generic confirmation message" do
    create_user

    post passwords_path, params: { email_address: "hr.manager@acme.test" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_match(/password reset instructions sent/i, body["message"])
  end

  test "requesting a reset for an email with no account returns the identical generic confirmation message" do
    post passwords_path, params: { email_address: "nobody@acme.test" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_match(/password reset instructions sent/i, body["message"])
  end

  test "requesting a reset for an existing email enqueues the reset email" do
    create_user

    assert_enqueued_emails 1 do
      post passwords_path, params: { email_address: "hr.manager@acme.test" }
    end
  end

  test "requesting a reset for a nonexistent email does not enqueue any email" do
    assert_no_enqueued_emails do
      post passwords_path, params: { email_address: "nobody@acme.test" }
    end
  end

  test "submitting a valid reset token sets a new password" do
    user = create_user(password: "SalaryAdmin!2024")
    token = user.password_reset_token

    patch password_path(token), params: { password: "NewPassword!99", password_confirmation: "NewPassword!99" }

    assert_response :success
    assert user.reload.authenticate("NewPassword!99")
  end

  test "after a successful reset, the old password no longer works" do
    user = create_user(password: "SalaryAdmin!2024")
    token = user.password_reset_token

    patch password_path(token), params: { password: "NewPassword!99", password_confirmation: "NewPassword!99" }

    assert_not user.reload.authenticate("SalaryAdmin!2024")
  end

  test "a successful reset invalidates any existing sessions for that user" do
    user = create_user(password: "SalaryAdmin!2024")
    session = user.sessions.create!

    patch password_path(user.password_reset_token),
      params: { password: "NewPassword!99", password_confirmation: "NewPassword!99" }

    assert_not Session.exists?(session.id)
  end

  test "an expired reset token is rejected with an error instead of changing the password" do
    user = create_user(password: "SalaryAdmin!2024")
    token = user.password_reset_token

    travel 16.minutes do
      patch password_path(token), params: { password: "NewPassword!99", password_confirmation: "NewPassword!99" }
    end

    assert_response :not_found
    assert user.reload.authenticate("SalaryAdmin!2024")
  end

  test "an invalid/garbage reset token is rejected with an error" do
    patch password_path("not-a-real-token"), params: { password: "NewPassword!99", password_confirmation: "NewPassword!99" }

    assert_response :not_found
    body = JSON.parse(response.body)
    assert_match(/invalid or has expired/i, body["error"])
  end

  test "submitting mismatched password confirmation returns a validation error" do
    user = create_user(password: "SalaryAdmin!2024")

    patch password_path(user.password_reset_token),
      params: { password: "NewPassword!99", password_confirmation: "SomethingElse!1" }

    assert_response :unprocessable_content
    assert user.reload.authenticate("SalaryAdmin!2024")
  end
end
