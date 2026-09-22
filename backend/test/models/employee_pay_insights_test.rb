require "test_helper"

class EmployeePayInsightsTest < ActiveSupport::TestCase
  def no_filters(overrides = {})
    { department: nil, country: nil, role: nil, employment_type: nil, status: nil }.merge(overrides)
  end

  test "computes average and median for an odd-sized group" do
    create_employee(base_salary: 100)
    create_employee(base_salary: 200)
    create_employee(base_salary: 400)

    row = Employee.pay_insights(no_filters, "department").find { |g| g[:group] == "engineering" }

    assert_equal 233.33, row[:average]
    assert_equal 200.0, row[:median]
    assert_equal 3, row[:count]
  end

  test "computes average and median for an even-sized group" do
    create_employee(base_salary: 100, department: "sales")
    create_employee(base_salary: 200, department: "sales")
    create_employee(base_salary: 300, department: "sales")
    create_employee(base_salary: 1000, department: "sales")

    row = Employee.pay_insights(no_filters, "department").find { |g| g[:group] == "sales" }

    assert_equal 400.0, row[:average]
    assert_equal 250.0, row[:median]
    assert_equal 4, row[:count]
  end

  test "computes average and median for a group with a single employee" do
    create_employee(base_salary: 750, department: "marketing")

    row = Employee.pay_insights(no_filters, "department").find { |g| g[:group] == "marketing" }

    assert_equal 750.0, row[:average]
    assert_equal 750.0, row[:median]
    assert_equal 1, row[:count]
  end

  test "never blends the same group's employees across different currencies" do
    create_employee(base_salary: 100, department: "engineering", country: "united_states")
    create_employee(base_salary: 200, department: "engineering", country: "united_states")
    create_employee(base_salary: 900, department: "engineering", country: "canada")

    engineering_rows = Employee.pay_insights(no_filters, "department").select { |g| g[:group] == "engineering" }

    assert_equal 2, engineering_rows.size
    usd_row = engineering_rows.find { |g| g[:currency] == "usd" }
    cad_row = engineering_rows.find { |g| g[:currency] == "cad" }
    assert_equal 150.0, usd_row[:average]
    assert_equal 150.0, usd_row[:median]
    assert_equal 2, usd_row[:count]
    assert_equal 900.0, cad_row[:average]
    assert_equal 900.0, cad_row[:median]
    assert_equal 1, cad_row[:count]
  end

  test "breaks down results by country" do
    create_employee(base_salary: 100, country: "united_states")
    create_employee(base_salary: 300, country: "germany")

    groups = Employee.pay_insights(no_filters, "country")

    assert_equal %w[germany united_states], groups.map { |g| g[:group] }.sort
  end

  test "breaks down results by role" do
    create_employee(base_salary: 100, role: "software_engineer")
    create_employee(base_salary: 300, role: "designer")

    groups = Employee.pay_insights(no_filters, "role")

    assert_equal %w[designer software_engineer], groups.map { |g| g[:group] }.sort
  end

  test "narrows the aggregate when a department filter is applied alongside a country breakdown" do
    create_employee(base_salary: 100, department: "engineering", country: "united_states")
    create_employee(base_salary: 500, department: "sales", country: "united_states")

    unfiltered_row = Employee.pay_insights(no_filters, "country").find { |g| g[:group] == "united_states" }
    filtered_row = Employee.pay_insights(no_filters(department: "engineering"), "country")
      .find { |g| g[:group] == "united_states" }

    assert_equal 300.0, unfiltered_row[:average]
    assert_equal 300.0, unfiltered_row[:median]
    assert_equal 2, unfiltered_row[:count]
    assert_equal 100.0, filtered_row[:average]
    assert_equal 100.0, filtered_row[:median]
    assert_equal 1, filtered_row[:count]
  end

  test "aggregates only inactive employees when the status filter is inactive" do
    create_employee(base_salary: 100, status: "active")
    create_employee(base_salary: 900, status: "inactive")

    row = Employee.pay_insights(no_filters(status: "inactive"), "department").find { |g| g[:group] == "engineering" }

    assert_equal 900.0, row[:average]
    assert_equal 900.0, row[:median]
    assert_equal 1, row[:count]
  end

  test "returns an empty array when no employees match the filters" do
    create_employee(department: "engineering")

    groups = Employee.pay_insights(no_filters(department: "legal"), "department")

    assert_equal [], groups
  end

  test "returns group and currency as enum string keys, not raw integers" do
    create_employee(department: "engineering", country: "united_states")

    row = Employee.pay_insights(no_filters, "department").first

    assert_equal "engineering", row[:group]
    assert_equal "usd", row[:currency]
  end

  test "sorts results by group then currency" do
    create_employee(department: "sales", country: "united_states")
    create_employee(department: "sales", country: "canada")
    create_employee(department: "engineering", country: "united_states")

    groups = Employee.pay_insights(no_filters, "department")

    assert_equal(
      [ %w[engineering usd], %w[sales cad], %w[sales usd] ],
      groups.map { |g| [ g[:group], g[:currency] ] }
    )
  end
end
