Rails.application.routes.draw do
  resource :session, only: %i[show create destroy]
  resources :passwords, param: :token, only: %i[create update]
  get "pay_insights", to: "pay_insights#index"
  resources :employees, only: %i[index show create update] do
    collection do
      get :filters
      get :manager_options
    end
    resource :deactivation, only: :create, module: :employees
  end

  get "up" => "rails/health#show", as: :rails_health_check
  get "health", to: "health_checks#show"
end
