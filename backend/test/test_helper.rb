ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    fixtures :all

    def sign_in_as(user, password: "password")
      post session_path, params: { email_address: user.email_address, password: password }
    end

    def sign_in_as_hr_manager
      sign_in_as(users(:hr_manager))
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
  end
end
