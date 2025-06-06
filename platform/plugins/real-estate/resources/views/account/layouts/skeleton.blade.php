@extends(Theme::getThemeNamespace('layouts.base'))

@section('content')
    {!! apply_filters('account_dashboard_header', null) !!}

    @php
        $menus = [
            // Default menus
            [
                'key'   => 'public.account.dashboard',
                'label' => __('Dashboard'),
                'icon'  => 'fa fa-tachometer-alt',
            ],
            /*
            [
                'key'   => 'public.account.crm.properties.match', // Route potentially causing error
                'label' => __('Matching Properties'),
                'icon'  => 'fa fa-binoculars',
            ],
            */
            [
                'key'   => 'public.account.settings',
                'label' => __('Settings'),
                'icon'  => 'fa fa-user-cog',
            ],
            [
                'key'   => 'public.account.security',
                'label' => __('Security'),
                'icon'  => 'fa fa-shield-alt',
            ],

            // Menus generated by plugins
            ...apply_filters(ACCOUNT_TOP_MENU_FILTER, []),

            // Logout menu
            [
                'key'   => 'public.account.logout',
                'label' => __('Logout'),
                'icon'  => 'fa fa-sign-out-alt',
                'routes' => ['public.account.logout'],
            ],
        ];

        foreach ($menus as $key => $menu) {
            if (!Arr::get($menu, 'key')) {
                continue;
            }

            if (Route::has(Arr::get($menu, 'key'))) {
                $menu['url'] = route(Arr::get($menu, 'key'));
            } elseif (Arr::get($menu, 'routes')) {
                foreach (Arr::get($menu, 'routes') as $route) {
                    if (Route::has($route)) {
                        $menu['url'] = route($route);
                        break;
                    }
                }
            }

            if (!Arr::get($menu, 'url') || !Auth::guard('account')->check()) {
                unset($menus[$key]);
                continue;
            }

            $menu['active'] = URL::current() == $menu['url'] || in_array(Route::currentRouteName(), Arr::get($menu, 'routes', []));

            $menus[$key] = $menu;
        }
    @endphp

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-3">
                <div class="mb-3 d-flex align-items-center">
                    <div class="me-3">
                        <img src="{{ Auth::guard('account')->user()->avatar_url }}" class="img-fluid rounded-circle" width="80" alt="{{ Auth::guard('account')->user()->name }}">
                    </div>
                    <div>
                        <h5 class="mb-0">{{ Auth::guard('account')->user()->name }}</h5>
                        <p class="text-muted">{{ Auth::guard('account')->user()->email }}</p>
                    </div>
                </div>
                <ul class="list-group list-group-transparent">
                    @foreach ($menus as $menu)
                        {{-- Commenting out the problematic route call if it's here as well --}}
                        {{-- Example check:
                        @if ($menu['key'] == 'public.account.crm.properties.match')
                            {{-- Skipping this menu item due to missing route --}}
                        {{-- @else --}}
                            <li class="list-group-item list-group-item-action @if ($menu['active']) active @endif">
                                <a href="{{ $menu['url'] }}" class="text-decoration-none @if ($menu['active']) text-white @endif">
                                    @if (Arr::get($menu, 'icon'))
                                        <i class="{{ $menu['icon'] }} me-2"></i>
                                    @endif
                                    {{ $menu['label'] }}
                                </a>
                            </li>
                        {{-- @endif --}}
                    @endforeach
                </ul>
            </div>
            <div class="col-md-9">
                <div class="card shadow-sm">
                    <div class="card-body">
                        @yield('account-content')
                    </div>
                </div>
            </div>
        </div>
    </div>

    {!! apply_filters('account_dashboard_footer', null) !!}
@endsection
