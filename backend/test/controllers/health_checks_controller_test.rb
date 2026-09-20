require "test_helper"

class HealthChecksControllerTest < ActionDispatch::IntegrationTest
  test "responds with 200 OK" do
    get health_path

    assert_response :success
  end

  test "responds with JSON content type" do
    get health_path

    assert_equal "application/json; charset=utf-8", response.content_type
  end

  test "responds with an ok status in the JSON body" do
    get health_path

    body = JSON.parse(response.body)
    assert_equal "ok", body["status"]
  end

  test "responds with the service name in the JSON body" do
    get health_path

    body = JSON.parse(response.body)
    assert_equal "employee-salary-management-api", body["service"]
  end
end
