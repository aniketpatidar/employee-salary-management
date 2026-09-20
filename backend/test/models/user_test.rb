require "test_helper"

class UserTest < ActiveSupport::TestCase
  def build_user(email_address: "hr.manager@acme.test", password: "SalaryAdmin!2024")
    User.new(email_address: email_address, password: password, password_confirmation: password)
  end

  test "authenticates with the correct password" do
    user = build_user(password: "correct-horse-battery").tap(&:save!)

    assert user.authenticate("correct-horse-battery")
  end

  test "does not authenticate with an incorrect password" do
    user = build_user(password: "correct-horse-battery").tap(&:save!)

    assert_not user.authenticate("wrong-password")
  end

  test "stores the password as a bcrypt digest, never in plaintext" do
    user = build_user(password: "correct-horse-battery").tap(&:save!)

    assert_not_equal "correct-horse-battery", user.password_digest
    assert_match(/\A\$2[aby]?\$/, user.password_digest)
  end

  test "normalizes email address by stripping whitespace and downcasing" do
    user = build_user(email_address: "  HR.Manager@ACME.test  ").tap(&:save!)

    assert_equal "hr.manager@acme.test", user.email_address
  end

  test "the database rejects a second user with the same email address" do
    build_user(email_address: "duplicate@acme.test").save!

    duplicate = build_user(email_address: "duplicate@acme.test")

    assert_raises(ActiveRecord::RecordNotUnique) { duplicate.save(validate: false) }
  end

  test "password reset token is accepted by find_by_password_reset_token! shortly after being issued" do
    user = build_user.tap(&:save!)
    token = user.password_reset_token

    found = User.find_by_password_reset_token!(token)

    assert_equal user.id, found.id
  end

  test "password reset token expires after 15 minutes" do
    user = build_user.tap(&:save!)
    token = user.password_reset_token

    travel 16.minutes do
      assert_raises(ActiveSupport::MessageVerifier::InvalidSignature) do
        User.find_by_password_reset_token!(token)
      end
    end
  end

  test "password reset token is still valid just before the 15 minute expiry" do
    user = build_user.tap(&:save!)
    token = user.password_reset_token

    travel 14.minutes do
      found = User.find_by_password_reset_token!(token)
      assert_equal user.id, found.id
    end
  end
end
