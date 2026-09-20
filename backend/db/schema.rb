# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_20_152835) do
  create_table "employees", force: :cascade do |t|
    t.decimal "base_salary", precision: 12, scale: 2, null: false
    t.integer "country", null: false
    t.datetime "created_at", null: false
    t.integer "currency", null: false
    t.integer "department", null: false
    t.integer "employment_type", null: false
    t.string "full_name", null: false
    t.date "hire_date", null: false
    t.integer "manager_id"
    t.integer "pay_frequency", null: false
    t.integer "role", null: false
    t.integer "status", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["country"], name: "index_employees_on_country"
    t.index ["department"], name: "index_employees_on_department"
    t.index ["employment_type"], name: "index_employees_on_employment_type"
    t.index ["manager_id"], name: "index_employees_on_manager_id"
    t.index ["role"], name: "index_employees_on_role"
    t.index ["status"], name: "index_employees_on_status"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.integer "user_id", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
  end

  add_foreign_key "employees", "employees", column: "manager_id"
  add_foreign_key "sessions", "users"
end
