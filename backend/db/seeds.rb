HR_MANAGER_EMAIL = "hr.manager@acme.test".freeze
HR_MANAGER_PASSWORD = "SalaryAdmin!2024".freeze

user = User.find_or_initialize_by(email_address: HR_MANAGER_EMAIL)
user.password = HR_MANAGER_PASSWORD
user.password_confirmation = HR_MANAGER_PASSWORD
user.save!
puts "HR Manager account ready: #{HR_MANAGER_EMAIL}"

TOTAL_EMPLOYEES = 10_000

puts "Generating #{TOTAL_EMPLOYEES} employee records..."
EmployeeSeeder.new(total: TOTAL_EMPLOYEES).call

puts "Seeded #{Employee.count} employees (#{Employee.active.count} active, #{Employee.inactive.count} inactive)."
