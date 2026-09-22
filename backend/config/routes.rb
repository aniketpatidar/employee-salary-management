Rails.application.routes.draw do
  resource :session, only: %i[show create destroy]
  resources :passwords, param: :token, only: %i[create update]
  resources :employees, only: %i[index show create update] do
    collection do
      get :filters
      get :manager_options
    end
    member do
      patch :deactivate
    end
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  get "health", to: "health_checks#show"

  # Defines the root path route ("/")
  # root "posts#index"
end
