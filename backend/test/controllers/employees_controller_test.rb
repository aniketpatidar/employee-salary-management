require "test_helper"

class EmployeesControllerTest < ActionDispatch::IntegrationTest
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

  test "unauthenticated visitors are rejected with 401 when requesting the protected employees route" do
    get employees_path

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "Not authenticated", body["error"]
  end

  test "unauthenticated visitors are rejected with 401 when requesting the filters route" do
    get filters_employees_path

    assert_response :unauthorized
  end

  test "an authenticated HR Manager can access the protected employees route" do
    sign_in_as_hr_manager

    get employees_path

    assert_response :success
  end

  test "returns employee fields required for the list table, no other fields" do
    sign_in_as_hr_manager
    employee = create_employee

    get employees_path

    body = JSON.parse(response.body)
    assert_equal(
      %w[id full_name department role country employment_type status].sort,
      body["employees"].first.keys.sort
    )
    assert_equal employee.id, body["employees"].first["id"]
  end

  test "default list view returns only active employees" do
    sign_in_as_hr_manager
    active_employee = create_employee(status: "active")
    create_employee(status: "inactive")

    get employees_path

    body = JSON.parse(response.body)
    assert_equal [ active_employee.id ], body["employees"].map { |e| e["id"] }
    assert_equal 1, body["total_count"]
  end

  test "filtering by status=inactive returns only inactive employees" do
    sign_in_as_hr_manager
    create_employee(status: "active")
    inactive_employee = create_employee(status: "inactive")

    get employees_path, params: { status: "inactive" }

    body = JSON.parse(response.body)
    assert_equal [ inactive_employee.id ], body["employees"].map { |e| e["id"] }
  end

  test "filtering by department returns only employees in that department" do
    sign_in_as_hr_manager
    create_employee(department: "engineering")
    sales_one = create_employee(department: "sales")
    sales_two = create_employee(department: "sales")

    get employees_path, params: { department: "sales" }

    body = JSON.parse(response.body)
    assert_equal [ sales_one.id, sales_two.id ].sort, body["employees"].map { |e| e["id"] }.sort
    assert_equal 2, body["total_count"]
  end

  test "filtering by country returns only employees in that country" do
    sign_in_as_hr_manager
    create_employee(country: "united_states")
    germany_employee = create_employee(country: "germany")

    get employees_path, params: { country: "germany" }

    body = JSON.parse(response.body)
    assert_equal [ germany_employee.id ], body["employees"].map { |e| e["id"] }
  end

  test "filtering by role returns only employees in that role" do
    sign_in_as_hr_manager
    create_employee(role: "software_engineer")
    manager = create_employee(role: "engineering_manager")

    get employees_path, params: { role: "engineering_manager" }

    body = JSON.parse(response.body)
    assert_equal [ manager.id ], body["employees"].map { |e| e["id"] }
  end

  test "filtering by employment_type returns only employees of that type" do
    sign_in_as_hr_manager
    create_employee(employment_type: "full_time")
    contractor = create_employee(employment_type: "contractor")

    get employees_path, params: { employment_type: "contractor" }

    body = JSON.parse(response.body)
    assert_equal [ contractor.id ], body["employees"].map { |e| e["id"] }
  end

  test "combining department and country filters applies AND logic" do
    sign_in_as_hr_manager
    matching = create_employee(department: "sales", country: "germany")
    create_employee(department: "sales", country: "united_states")
    create_employee(department: "engineering", country: "germany")

    get employees_path, params: { department: "sales", country: "germany" }

    body = JSON.parse(response.body)
    assert_equal [ matching.id ], body["employees"].map { |e| e["id"] }
  end

  test "returns an empty employees array and zero total_count when no employees match the filters" do
    sign_in_as_hr_manager
    create_employee(department: "engineering")

    get employees_path, params: { department: "legal" }

    body = JSON.parse(response.body)
    assert_equal [], body["employees"]
    assert_equal 0, body["total_count"]
  end

  test "invalid department filter value returns 422 with an explanatory error" do
    sign_in_as_hr_manager

    get employees_path, params: { department: "not_a_real_department" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "Invalid department filter value", body["error"]
  end

  test "invalid status filter value returns 422 with an explanatory error" do
    sign_in_as_hr_manager

    get employees_path, params: { status: "terminated" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "Invalid status filter value", body["error"]
  end

  test "orders results stably by id so page contents don't shift between requests" do
    sign_in_as_hr_manager
    first = create_employee
    second = create_employee
    third = create_employee

    get employees_path, params: { per_page: 10 }

    body = JSON.parse(response.body)
    assert_equal [ first.id, second.id, third.id ], body["employees"].map { |e| e["id"] }
  end

  test "paginates results and reports the requested page, per_page, and total_count" do
    sign_in_as_hr_manager
    employees = 5.times.map { create_employee }

    get employees_path, params: { page: 1, per_page: 2 }

    body = JSON.parse(response.body)
    assert_equal employees.first(2).map(&:id), body["employees"].map { |e| e["id"] }
    assert_equal 1, body["page"]
    assert_equal 2, body["per_page"]
    assert_equal 5, body["total_count"]
  end

  test "page 2 returns the next slice of results, not a repeat of page 1" do
    sign_in_as_hr_manager
    employees = 5.times.map { create_employee }

    get employees_path, params: { page: 2, per_page: 2 }

    body = JSON.parse(response.body)
    assert_equal employees[2, 2].map(&:id), body["employees"].map { |e| e["id"] }
    assert_equal 2, body["page"]
  end

  test "a zero page number is treated as page 1" do
    sign_in_as_hr_manager
    employee = create_employee

    get employees_path, params: { page: 0 }

    body = JSON.parse(response.body)
    assert_equal 1, body["page"]
    assert_equal [ employee.id ], body["employees"].map { |e| e["id"] }
  end

  test "a negative page number is treated as page 1" do
    sign_in_as_hr_manager
    create_employee

    get employees_path, params: { page: -3 }

    body = JSON.parse(response.body)
    assert_equal 1, body["page"]
  end

  test "per_page above the maximum is clamped to the maximum" do
    sign_in_as_hr_manager
    create_employee

    get employees_path, params: { per_page: 500 }

    body = JSON.parse(response.body)
    assert_equal 100, body["per_page"]
  end

  test "per_page defaults to 25 when not provided" do
    sign_in_as_hr_manager
    create_employee

    get employees_path

    body = JSON.parse(response.body)
    assert_equal 25, body["per_page"]
  end

  test "per_page of zero falls back to the default of 25" do
    sign_in_as_hr_manager
    create_employee

    get employees_path, params: { per_page: 0 }

    body = JSON.parse(response.body)
    assert_equal 25, body["per_page"]
  end

  test "a negative per_page falls back to the default of 25" do
    sign_in_as_hr_manager
    create_employee

    get employees_path, params: { per_page: -10 }

    body = JSON.parse(response.body)
    assert_equal 25, body["per_page"]
  end

  test "a non-numeric per_page falls back to the default of 25" do
    sign_in_as_hr_manager
    create_employee

    get employees_path, params: { per_page: "abc" }

    body = JSON.parse(response.body)
    assert_equal 25, body["per_page"]
  end

  test "per_page of exactly 100 is accepted without clamping" do
    sign_in_as_hr_manager
    create_employee

    get employees_path, params: { per_page: 100 }

    body = JSON.parse(response.body)
    assert_equal 100, body["per_page"]
  end

  test "GET /employees/filters returns the enum key lists for each filterable field" do
    sign_in_as_hr_manager

    get filters_employees_path

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal Employee.departments.keys, body["department"]
    assert_equal Employee.countries.keys, body["country"]
    assert_equal Employee.roles.keys, body["role"]
    assert_equal Employee.employment_types.keys, body["employment_type"]
    assert_equal Employee.statuses.keys, body["status"]
  end
end
