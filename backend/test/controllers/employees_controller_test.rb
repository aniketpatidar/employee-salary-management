require "test_helper"

class EmployeesControllerTest < ActionDispatch::IntegrationTest
  test "unauthenticated visitors are rejected with 401 when requesting the protected employees route" do
    get employees_path

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "Not authenticated", body["error"]
  end

  test "an authenticated HR Manager can access the protected employees route" do
    User.create!(email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024",
      password_confirmation: "SalaryAdmin!2024")
    post session_path, params: { email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024" }

    get employees_path

    assert_response :success
  end
end
