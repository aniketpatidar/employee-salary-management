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

  test "GET /employees/filters includes the country_currency mapping" do
    sign_in_as_hr_manager

    get filters_employees_path

    body = JSON.parse(response.body)
    assert_equal Employee::COUNTRY_CURRENCY_MAP, body["country_currency"]
  end

  def valid_employee_params(overrides = {})
    {
      full_name: "New Hire",
      department: "engineering",
      role: "software_engineer",
      country: "united_states",
      base_salary: "80000",
      employment_type: "full_time",
      pay_frequency: "annual",
      hire_date: "2022-01-15"
    }.merge(overrides)
  end

  test "GET /employees/:id returns employee fields plus a manager summary" do
    sign_in_as_hr_manager
    manager = create_employee(full_name: "Manager Person")
    employee = create_employee(manager_id: manager.id)

    get employee_path(employee)

    assert_response :success
    body = JSON.parse(response.body)["employee"]
    assert_equal employee.id, body["id"]
    assert_equal "usd", body["currency"]
    assert_equal({ "id" => manager.id, "full_name" => "Manager Person" }, body["manager"])
  end

  test "GET /employees/:id returns null manager when the employee has none" do
    sign_in_as_hr_manager
    employee = create_employee

    get employee_path(employee)

    body = JSON.parse(response.body)["employee"]
    assert_nil body["manager"]
  end

  test "GET /employees/:id returns 404 for an unknown id" do
    sign_in_as_hr_manager

    get employee_path(999_999)

    assert_response :not_found
    body = JSON.parse(response.body)
    assert_equal "Employee not found", body["error"]
  end

  test "GET /employees/:id is rejected with 401 when unauthenticated" do
    employee = create_employee

    get employee_path(employee)

    assert_response :unauthorized
  end

  test "POST /employees creates the employee and returns 201 with id and derived currency" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(country: "germany")

    assert_response :created
    body = JSON.parse(response.body)["employee"]
    assert body["id"].present?
    assert_equal "eur", body["currency"]
    assert_equal "active", body["status"]
  end

  %i[full_name department role country base_salary employment_type pay_frequency hire_date].each do |field|
    test "create returns 422 with an error on #{field} when it is blank" do
      sign_in_as_hr_manager

      post employees_path, params: valid_employee_params(field => "")

      assert_response :unprocessable_entity
      body = JSON.parse(response.body)
      assert body["errors"][field.to_s].present?, "expected an error on #{field}, got #{body["errors"]}"
    end
  end

  test "create returns 422 when base_salary is zero" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(base_salary: "0")

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "must be greater than 0" ], body["errors"]["base_salary"]
  end

  test "create returns 422 when base_salary is negative" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(base_salary: "-500")

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "must be greater than 0" ], body["errors"]["base_salary"]
  end

  test "create returns 422, not 500, when base_salary is not a number" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(base_salary: "abc")

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "is not a number" ], body["errors"]["base_salary"]
  end

  test "create returns 422 when hire_date is in the future" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(hire_date: (Date.current + 1).to_s)

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "can't be in the future" ], body["errors"]["hire_date"]
  end

  test "create returns 422, not 500, for an out-of-list department" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(department: "not_a_real_department")

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert body["errors"]["department"].present?
  end

  test "create returns 422, not 500, for an out-of-list role" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(role: "wizard")

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert body["errors"]["role"].present?
  end

  test "create returns 422, not 500, for an out-of-list country" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(country: "narnia")

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert body["errors"]["country"].present?
  end

  test "create ignores a client-supplied id, status, and currency" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(id: 999_999, status: "inactive", currency: "eur")

    assert_response :created
    body = JSON.parse(response.body)["employee"]
    assert_not_equal 999_999, body["id"]
    assert_equal "active", body["status"]
    assert_equal "usd", body["currency"]
  end

  test "create rejects an inactive employee as manager" do
    sign_in_as_hr_manager
    inactive_manager = create_employee(status: "inactive")

    post employees_path, params: valid_employee_params(manager_id: inactive_manager.id)

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "must be an active employee" ], body["errors"]["manager_id"]
  end

  test "create rejects a nonexistent manager id" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params(manager_id: 999_999)

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "must be an active employee" ], body["errors"]["manager_id"]
  end

  test "create accepts a valid active manager" do
    sign_in_as_hr_manager
    manager = create_employee(status: "active")

    post employees_path, params: valid_employee_params(manager_id: manager.id)

    assert_response :created
    body = JSON.parse(response.body)["employee"]
    assert_equal manager.id, body["manager_id"]
  end

  test "create succeeds without a manager since manager is optional" do
    sign_in_as_hr_manager

    post employees_path, params: valid_employee_params

    assert_response :created
    body = JSON.parse(response.body)["employee"]
    assert_nil body["manager_id"]
  end

  test "POST /employees is rejected with 401 when unauthenticated" do
    post employees_path, params: valid_employee_params

    assert_response :unauthorized
  end

  test "PATCH /employees/:id updates the salary" do
    sign_in_as_hr_manager
    employee = create_employee(base_salary: 50_000)

    patch employee_path(employee), params: { base_salary: "70000" }

    assert_response :success
    assert_equal 70_000, employee.reload.base_salary
  end

  test "PATCH /employees/:id re-derives currency when country changes" do
    sign_in_as_hr_manager
    employee = create_employee(country: "united_states")

    patch employee_path(employee), params: { country: "japan" }

    body = JSON.parse(response.body)["employee"]
    assert_equal "jpy", body["currency"]
    assert_equal "jpy", employee.reload.currency
  end

  test "PATCH /employees/:id returns 422 when a required field is cleared" do
    sign_in_as_hr_manager
    employee = create_employee

    patch employee_path(employee), params: { full_name: "" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "can't be blank" ], body["errors"]["full_name"]
  end

  test "PATCH /employees/:id returns 422 when base_salary becomes non-numeric" do
    sign_in_as_hr_manager
    employee = create_employee

    patch employee_path(employee), params: { base_salary: "abc" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "is not a number" ], body["errors"]["base_salary"]
  end

  test "PATCH /employees/:id ignores a client-supplied id, status, and currency" do
    sign_in_as_hr_manager
    employee = create_employee(country: "united_states")

    patch employee_path(employee), params: { id: 999_999, status: "inactive", currency: "eur" }

    assert_response :success
    body = JSON.parse(response.body)["employee"]
    assert_equal employee.id, body["id"]
    assert_equal "active", body["status"]
    assert_equal "usd", body["currency"]
  end

  test "PATCH /employees/:id returns 404 for an unknown id" do
    sign_in_as_hr_manager

    patch employee_path(999_999), params: { base_salary: "70000" }

    assert_response :not_found
  end

  test "PATCH /employees/:id is rejected with 401 when unauthenticated" do
    employee = create_employee

    patch employee_path(employee), params: { base_salary: "70000" }

    assert_response :unauthorized
  end

  test "PATCH /employees/:id/deactivate sets status to inactive" do
    sign_in_as_hr_manager
    employee = create_employee(status: "active")

    patch deactivate_employee_path(employee)

    assert_response :success
    body = JSON.parse(response.body)["employee"]
    assert_equal "inactive", body["status"]
    assert_equal "inactive", employee.reload.status
  end

  test "deactivated employee disappears from the default active-only list" do
    sign_in_as_hr_manager
    employee = create_employee(status: "active")

    patch deactivate_employee_path(employee)
    get employees_path

    body = JSON.parse(response.body)
    assert_not_includes body["employees"].map { |e| e["id"] }, employee.id
  end

  test "deactivated employee still appears when filtering status=inactive" do
    sign_in_as_hr_manager
    employee = create_employee(status: "active")

    patch deactivate_employee_path(employee)
    get employees_path, params: { status: "inactive" }

    body = JSON.parse(response.body)
    assert_includes body["employees"].map { |e| e["id"] }, employee.id
  end

  test "deactivating a manager leaves the manager_id on their reports intact" do
    sign_in_as_hr_manager
    manager = create_employee(status: "active")
    report = create_employee(manager_id: manager.id)

    patch deactivate_employee_path(manager)

    assert_equal manager.id, report.reload.manager_id
  end

  test "PATCH /employees/:id/deactivate returns 404 for an unknown id" do
    sign_in_as_hr_manager

    patch deactivate_employee_path(999_999)

    assert_response :not_found
  end

  test "PATCH /employees/:id/deactivate is rejected with 401 when unauthenticated" do
    employee = create_employee

    patch deactivate_employee_path(employee)

    assert_response :unauthorized
  end

  test "PATCH /employees/:id updates the salary of a report whose manager was deactivated" do
    sign_in_as_hr_manager
    manager = create_employee(status: "active")
    report = create_employee(manager_id: manager.id)
    patch deactivate_employee_path(manager)

    patch employee_path(report), params: { base_salary: "88000" }

    assert_response :success
    assert_equal 88_000, report.reload.base_salary
  end

  test "PATCH /employees/:id/deactivate succeeds for a report whose manager was deactivated" do
    sign_in_as_hr_manager
    manager = create_employee(status: "active")
    report = create_employee(manager_id: manager.id)
    patch deactivate_employee_path(manager)

    patch deactivate_employee_path(report)

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "inactive", body["employee"]["status"]
  end

  test "PATCH /employees/:id returns 422 when changing manager_id to an inactive employee" do
    sign_in_as_hr_manager
    employee = create_employee
    inactive_manager = create_employee(status: "inactive")

    patch employee_path(employee), params: { manager_id: inactive_manager.id }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal [ "must be an active employee" ], body["errors"]["manager_id"]
  end

  test "manager_options matches by name case-insensitively" do
    sign_in_as_hr_manager
    match = create_employee(full_name: "Priya Sharma")
    create_employee(full_name: "John Smith")

    get manager_options_employees_path, params: { q: "priya" }

    body = JSON.parse(response.body)
    assert_equal [ match.id ], body.map { |e| e["id"] }
  end

  test "manager_options excludes inactive employees" do
    sign_in_as_hr_manager
    create_employee(full_name: "Inactive Person", status: "inactive")

    get manager_options_employees_path, params: { q: "Inactive" }

    body = JSON.parse(response.body)
    assert_equal [], body
  end

  test "manager_options excludes the given exclude_id" do
    sign_in_as_hr_manager
    employee = create_employee(full_name: "Self Person")

    get manager_options_employees_path, params: { q: "Self", exclude_id: employee.id }

    body = JSON.parse(response.body)
    assert_equal [], body
  end

  test "manager_options caps results at 10" do
    sign_in_as_hr_manager
    15.times { |n| create_employee(full_name: "Candidate #{n}") }

    get manager_options_employees_path, params: { q: "Candidate" }

    body = JSON.parse(response.body)
    assert_equal 10, body.length
  end

  test "manager_options with an empty q returns the first 10 active employees ordered by name" do
    sign_in_as_hr_manager
    create_employee(full_name: "Zeta")
    create_employee(full_name: "Alpha")
    create_employee(full_name: "Mid")
    create_employee(full_name: "Inactive One", status: "inactive")

    get manager_options_employees_path

    body = JSON.parse(response.body)
    assert_equal %w[Alpha Mid Zeta], body.map { |e| e["full_name"] }
  end

  test "manager_options treats % and _ in q as literal characters, not wildcards" do
    sign_in_as_hr_manager
    literal_match = create_employee(full_name: "100%_Match")
    create_employee(full_name: "100xyMatch")

    get manager_options_employees_path, params: { q: "100%_Match" }

    body = JSON.parse(response.body)
    assert_equal [ literal_match.id ], body.map { |e| e["id"] }
  end

  test "manager_options is rejected with 401 when unauthenticated" do
    get manager_options_employees_path

    assert_response :unauthorized
  end
end
