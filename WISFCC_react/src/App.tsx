
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { ConfigProvider, theme } from 'antd';
import { createGlobalStyle } from 'styled-components';
import { THEME } from './styles/theme'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleGuard } from './features/auth/RoleGuard';



import AuthGuard from './features/auth/AuthGuard';
import GlobalLoading from './components/GlobalLoading';
import { SystemErrorFallback } from './components/SystemErrorFallback';
import { SessionWatcher } from './features/auth/SessionWatcher';
import { genSubStyleComponent } from 'antd/es/theme/internal';


const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const FleetCrudPage = lazy(() => import('./features/crud/FleetCrudView'));
const DashboardLayout = lazy(() => import('./pages/DashboardPage')); 
const SchedulerView = lazy(() => import('./features/scheduler/SchedulerView'));
const CollisionCasView = lazy(() => import('./features/cas/CollisionCasView'));
const ReportsView = lazy(() => import('./features/reports/ReportsView'));
const UsersManagementView = lazy(() => import('./features/users/UsersManagementView'));
const SettingsView = lazy(() => import('./features/settings/SettingsView'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, 
      refetchOnWindowFocus: false, 
      retry: 1, 
    },
  },
});

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm, 
        token: {
          colorBgBase: '#0A121F', 
          colorBgElevated: '#0A121F', 
          colorBorder: '#00FFFF', 
          colorTextBase: '#ffffff',
          colorPrimary: '#00FFFF', 
        },
        components: {
          Modal: {
            contentBg: '#0A121F',
            headerBg: '#0A121F',
          },
          Popover: {
            colorBgElevated: '#0A121F', 
          },
          Message: {
            contentBg: '#0A121F', 
          }
        }
      }}
    >
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <ErrorBoundary FallbackComponent={SystemErrorFallback}>
        
        <Suspense fallback={<GlobalLoading />}>
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <SessionWatcher />
                  <DashboardLayout /> 
                </AuthGuard>
              }
            >
              <Route 
                path="crud" 
                element={
                  <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
                    <FleetCrudPage />
                  </RoleGuard>
                } 
              />
                <Route 
                  path="scheduler" 
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
                      <SchedulerView />
                    </RoleGuard>
                  } 
                />
                
                <Route 
                  path="cas" 
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
                      <CollisionCasView />
                    </RoleGuard>
                  } 
                />
                
                <Route 
                  path="reports" 
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'OPERATOR']}>
                      <ReportsView />
                    </RoleGuard>
                  } 
                />
                
                <Route 
                  path="users" 
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <UsersManagementView />
                    </RoleGuard>
                  } 
                />
                
                <Route 
                  path="settings" 
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'OPERATOR', 'GUEST']}>
                      <SettingsView />
                    </RoleGuard>
                  } 
                />
              
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
    </QueryClientProvider>
  </ConfigProvider>
  );
}

export default App;