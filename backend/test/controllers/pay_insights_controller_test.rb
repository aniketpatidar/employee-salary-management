require "test_helper"

class PayInsightsControllerTest < ActionDispatch::IntegrationTest
  def sign_in_as_hr_manager
    User.create!(email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024",
      password_confirmation: "SalaryAdmin!2024")
    post session_path, params: { email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024" }
  end

  def create_employee(overrides = {})
    Employee.create!({
      full_name: "Jane Doe",
      department: "engineering",
      role: "software_engineer",
      country: "united_states",
      base_salary: 95_000,
      employment_type: "full_time",
      pay_frequency: "annual",
      hire_date: Date.new(2022, 1, 15),
      status: "active"
    }.merge(overrides))
  end

  test "returns 200 with group, currency, average, median, and count for each row" do
    sign_in_as_hr_manager
    create_employee(department: "engineering", base_salary: 100_000)

    get pay_insights_path, params: { breakdown: "department" }

    assert_response :success
    body = JSON.parse(response.body)
    row = body["groups"].first
    assert_equal(%w[average currency group median count].sort, row.keys.sort)
    assert_equal "engineering", row["group"]
    assert_equal "usd", row["currency"]
  end

  test "returns 422 when breakdown is missing" do
    sign_in_as_hr_manager

    get pay_insights_path

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "Invalid breakdown value", body["error"]
  end

  test "returns 422 when breakdown is not one of department, country, or role" do
    sign_in_as_hr_manager

    get pay_insights_path, params: { breakdown: "salary" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "Invalid breakdown value", body["error"]
  end

  test "returns 422 when a filter value is outside the predefined list" do
    sign_in_as_hr_manager

    get pay_insights_path, params: { breakdown: "department", country: "narnia" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "Invalid country filter value", body["error"]
  end

  test "excludes inactive employees by default" do
    sign_in_as_hr_manager
    create_employee(status: "active", base_salary: 100_000)
    create_employee(status: "inactive", base_salary: 500_000)

    get pay_insights_path, params: { breakdown: "department" }

    body = JSON.parse(response.body)
    assert_equal 1, body["groups"].first["count"]
    assert_equal 100_000.0, body["groups"].first["average"]
  end

  test "aggregates only inactive employees when status=inactive is requested" do
    sign_in_as_hr_manager
    create_employee(status: "active", base_salary: 100_000)
    create_employee(status: "inactive", base_salary: 500_000)

    get pay_insights_path, params: { breakdown: "department", status: "inactive" }

    body = JSON.parse(response.body)
    assert_equal 1, body["groups"].first["count"]
    assert_equal 500_000.0, body["groups"].first["average"]
  end

  test "returns an empty groups array when no employees match the filters" do
    sign_in_as_hr_manager
    create_employee(department: "engineering")

    get pay_insights_path, params: { breakdown: "department", department: "legal" }

    body = JSON.parse(response.body)
    assert_equal [], body["groups"]
  end

  test "is rejected with 401 when unauthenticated" do
    get pay_insights_path, params: { breakdown: "department" }

    assert_response :unauthorized
  end
end
