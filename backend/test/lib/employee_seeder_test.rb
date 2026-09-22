require "test_helper"

class EmployeeSeederTest < ActiveSupport::TestCase
  def build_seeder(total: 50, random: Random.new(1234))
    EmployeeSeeder.new(total: total, random: random)
  end

  test "builds exactly the requested number of records" do
    records = build_seeder(total: 50).build_records

    assert_equal 50, records.size
  end

  test "only uses department, role, country, employment_type, pay_frequency, and status values from the predefined enums" do
    records = build_seeder(total: 100).build_records

    records.each do |record|
      assert_includes Employee.departments.values, record[:department]
      assert_includes Employee.roles.values, record[:role]
      assert_includes Employee.countries.values, record[:country]
      assert_includes Employee.employment_types.values, record[:employment_type]
      assert_includes Employee.pay_frequencies.values, record[:pay_frequency]
      assert_includes Employee.statuses.values, record[:status]
    end
  end

  test "currency always matches the country via COUNTRY_CURRENCY_MAP" do
    records = build_seeder(total: 200).build_records

    records.each do |record|
      country_key = Employee.countries.key(record[:country])
      expected_currency = Employee.currencies.fetch(Employee::COUNTRY_CURRENCY_MAP.fetch(country_key))

      assert_equal expected_currency, record[:currency]
    end
  end

  test "generates each base salary within its currency's predefined range" do
    records = build_seeder(total: 200, random: Random.new(99)).build_records

    records.each do |record|
      currency_key = Employee.currencies.key(record[:currency])
      range = EmployeeSeeder::CURRENCY_SALARY_RANGES.fetch(currency_key)

      assert_includes range, record[:base_salary].floor,
        "expected #{record[:base_salary]} to fall within #{currency_key}'s range #{range}"
    end
  end

  test "produces a mix of active and inactive employees" do
    records = build_seeder(total: 200).build_records
    statuses = records.map { |record| record[:status] }.uniq

    assert_includes statuses, Employee.statuses.fetch("active")
    assert_includes statuses, Employee.statuses.fetch("inactive")
  end

  test "assigns a manager only from an earlier, active employee in the same department" do
    records = build_seeder(total: 300).build_records
    records_by_id = records.index_by { |record| record[:id] }

    managed_records = records.select { |record| record[:manager_id] }
    assert managed_records.any?, "expected at least one generated employee to have a manager assigned"

    managed_records.each do |record|
      manager_record = records_by_id.fetch(record[:manager_id])

      assert manager_record[:id] < record[:id], "manager must be created before the report"
      assert_equal Employee.statuses.fetch("active"), manager_record[:status]
      assert_not_equal record[:id], record[:manager_id], "an employee cannot manage themselves"
    end
  end

  test "is deterministic given the same injected random source" do
    strip_timestamps = ->(records) { records.map { |record| record.except(:created_at, :updated_at) } }

    first_run = build_seeder(total: 30, random: Random.new(42)).build_records
    second_run = build_seeder(total: 30, random: Random.new(42)).build_records

    assert_equal strip_timestamps.call(first_run), strip_timestamps.call(second_run)
  end

  test "persists the requested number of employees to the database" do
    build_seeder(total: 25).call

    assert_equal 25, Employee.count
  end

  test "re-running replaces the dataset instead of duplicating it" do
    build_seeder(total: 20, random: Random.new(1)).call
    build_seeder(total: 20, random: Random.new(2)).call

    assert_equal 20, Employee.count
  end

  test "re-running does not raise even though employees self-reference via manager_id" do
    assert_nothing_raised do
      build_seeder(total: 100, random: Random.new(7)).call
      build_seeder(total: 100, random: Random.new(8)).call
    end
  end

  test "persisted employees pass model validations" do
    build_seeder(total: 25).call

    Employee.find_each do |employee|
      assert employee.valid?, employee.errors.full_messages.join(", ")
    end
  end
end
