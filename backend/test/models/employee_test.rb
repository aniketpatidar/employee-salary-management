require "test_helper"

class EmployeeTest < ActiveSupport::TestCase
  def valid_attributes(overrides = {})
    {
      full_name: "Jane Doe",
      department: "engineering",
      role: "software_engineer",
      country: "united_states",
      base_salary: 95_000,
      employment_type: "full_time",
      pay_frequency: "annual",
      hire_date: Date.new(2022, 1, 15)
    }.merge(overrides)
  end

  test "is valid with all required attributes" do
    employee = Employee.new(valid_attributes)

    assert employee.valid?
  end

  test "derives currency from country on create" do
    employee = Employee.create!(valid_attributes(country: "germany"))

    assert_equal "eur", employee.currency
  end

  test "re-derives currency when country changes" do
    employee = Employee.create!(valid_attributes(country: "united_states"))
    assert_equal "usd", employee.currency

    employee.update!(country: "japan")

    assert_equal "jpy", employee.currency
  end

  test "is invalid without a full name" do
    employee = Employee.new(valid_attributes(full_name: nil))

    assert_not employee.valid?
    assert_includes employee.errors[:full_name], "can't be blank"
  end

  test "is invalid when base salary is zero" do
    employee = Employee.new(valid_attributes(base_salary: 0))

    assert_not employee.valid?
    assert_includes employee.errors[:base_salary], "must be greater than 0"
  end

  test "is invalid when base salary is negative" do
    employee = Employee.new(valid_attributes(base_salary: -100))

    assert_not employee.valid?
    assert_includes employee.errors[:base_salary], "must be greater than 0"
  end

  test "is invalid when hire date is in the future" do
    employee = Employee.new(valid_attributes(hire_date: Date.current + 1))

    assert_not employee.valid?
    assert_includes employee.errors[:hire_date], "can't be in the future"
  end

  test "is valid when hire date is today" do
    employee = Employee.new(valid_attributes(hire_date: Date.current))

    assert employee.valid?
  end

  test "rejects a department value outside the predefined enum list" do
    employee = Employee.new(valid_attributes(department: "not_a_real_department"))

    assert_not employee.valid?
    assert_includes employee.errors[:department], "is not included in the list"
  end

  test "rejects a country value outside the predefined enum list" do
    employee = Employee.new(valid_attributes(country: "narnia"))

    assert_not employee.valid?
    assert_includes employee.errors[:country], "is not included in the list"
  end

  test "rejects a role value outside the predefined enum list" do
    employee = Employee.new(valid_attributes(role: "wizard"))

    assert_not employee.valid?
    assert_includes employee.errors[:role], "is not included in the list"
  end

  test "defaults status to active" do
    employee = Employee.create!(valid_attributes)

    assert employee.active?
  end

  test "allows manager_id to be blank" do
    employee = Employee.new(valid_attributes(manager_id: nil))

    assert employee.valid?
  end

  test "allows setting a manager to an existing employee" do
    manager = Employee.create!(valid_attributes(role: "engineering_manager"))
    report = Employee.new(valid_attributes(manager_id: manager.id))

    assert report.valid?
    assert_equal manager, report.manager
  end

  test "rejects an inactive employee as manager" do
    manager = Employee.create!(valid_attributes(role: "engineering_manager", status: "inactive"))
    report = Employee.new(valid_attributes(manager_id: manager.id))

    assert_not report.valid?
    assert_includes report.errors[:manager_id], "must be an active employee"
  end

  test "rejects a nonexistent manager id" do
    employee = Employee.new(valid_attributes(manager_id: -1))

    assert_not employee.valid?
    assert_includes employee.errors[:manager_id], "must be an active employee"
  end

  test "rejects an employee as their own manager" do
    employee = Employee.create!(valid_attributes)
    employee.manager_id = employee.id

    assert_not employee.valid?
    assert_includes employee.errors[:manager_id], "can't be the employee's own manager"
  end

  test "name_matches scope finds employees whose name contains the query, case-insensitively" do
    matching = Employee.create!(valid_attributes(full_name: "Priya Sharma"))
    Employee.create!(valid_attributes(full_name: "John Smith"))

    results = Employee.name_matches("priya")

    assert_equal [ matching.id ], results.map(&:id)
  end

  test "name_matches scope treats % and _ in the query as literal characters" do
    Employee.create!(valid_attributes(full_name: "Priya Sharma"))
    literal_match = Employee.create!(valid_attributes(full_name: "100%_Match"))

    results = Employee.name_matches("100%_Match")

    assert_equal [ literal_match.id ], results.map(&:id)
  end

  test "excluding_id scope omits the given id from results" do
    keep = Employee.create!(valid_attributes(full_name: "Keep Me"))
    exclude = Employee.create!(valid_attributes(full_name: "Exclude Me"))

    results = Employee.excluding_id(exclude.id)

    assert_includes results.map(&:id), keep.id
    assert_not_includes results.map(&:id), exclude.id
  end

  COUNTRY_CURRENCY_MAP_CASES = {
    "united_states" => "usd",
    "canada" => "cad",
    "united_kingdom" => "gbp",
    "germany" => "eur",
    "france" => "eur",
    "india" => "inr",
    "australia" => "aud",
    "japan" => "jpy",
    "brazil" => "brl",
    "singapore" => "sgd"
  }.freeze

  COUNTRY_CURRENCY_MAP_CASES.each do |country, currency|
    test "derives #{currency} for #{country}" do
      employee = Employee.create!(valid_attributes(country: country))

      assert_equal currency, employee.currency
    end
  end
end
