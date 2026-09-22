require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  def create_user(email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024")
    User.create!(email_address: email_address, password: password, password_confirmation: password)
  end

  test "logging in with correct credentials creates a session row and sets a session cookie" do
    create_user(password: "SalaryAdmin!2024")

    assert_difference "Session.count", 1 do
      post session_path, params: { email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024" }
    end

    assert_response :success
    assert cookies[:session_id].present?
  end

  test "the session cookie expires roughly 2 weeks from login" do
    create_user(password: "SalaryAdmin!2024")

    post session_path, params: { email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024" }

    expires_at = Time.httpdate(response.headers["Set-Cookie"][/expires=([^;]+)/, 1])
    assert_in_delta 2.weeks.from_now, expires_at, 1.minute
  end

  test "logging in with an incorrect password returns a generic invalid-credentials error" do
    create_user(password: "SalaryAdmin!2024")

    post session_path, params: { email_address: "hr.manager@acme.test", password: "wrong-password" }

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "Invalid email or password", body["error"]
  end

  test "logging in with an email that has no account returns the same generic error as a wrong password" do
    post session_path, params: { email_address: "nobody@acme.test", password: "whatever123" }

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "Invalid email or password", body["error"]
  end

  test "logging in does not create a session row on failure" do
    create_user(password: "SalaryAdmin!2024")

    assert_no_difference "Session.count" do
      post session_path, params: { email_address: "hr.manager@acme.test", password: "wrong-password" }
    end
  end

  test "logging out destroys the session row and clears the session cookie" do
    create_user(password: "SalaryAdmin!2024")
    post session_path, params: { email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024" }

    assert_difference "Session.count", -1 do
      delete session_path
    end

    assert_response :success
    assert cookies[:session_id].blank?
  end

  test "a destroyed session can no longer access a protected route" do
    create_user(password: "SalaryAdmin!2024")
    post session_path, params: { email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024" }
    delete session_path

    get employees_path

    assert_response :unauthorized
  end
end
