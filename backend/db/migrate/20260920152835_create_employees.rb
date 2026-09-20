class CreateEmployees < ActiveRecord::Migration[8.1]
  def change
    create_table :employees do |t|
      t.string :full_name, null: false
      t.integer :department, null: false
      t.integer :role, null: false
      t.integer :country, null: false
      t.integer :currency, null: false
      t.decimal :base_salary, precision: 12, scale: 2, null: false
      t.integer :employment_type, null: false
      t.integer :pay_frequency, null: false
      t.integer :manager_id
      t.date :hire_date, null: false
      t.integer :status, null: false, default: 0

      t.timestamps
    end

    add_index :employees, :department
    add_index :employees, :country
    add_index :employees, :role
    add_index :employees, :employment_type
    add_index :employees, :status
    add_index :employees, :manager_id

    add_foreign_key :employees, :employees, column: :manager_id
  end
end
