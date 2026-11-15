import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AdminLayout } from './AdminLayout.tsx';
import { DashboardPage } from './DashboardPage.tsx';
import { DonorDetailsPage } from './DonorDetailsPage.tsx';
import { DonorFormPage } from './DonorFormPage.tsx';
import { DonorListPage } from './DonorListPage.tsx';
import { LoginPage } from './LoginPage.tsx';
import { RequestDetailsPage } from './RequestDetailsPage.tsx';
import { RequestFormPage } from './RequestFormPage.tsx';
import { RequestListPage } from './RequestListPage.tsx';
import './styles.css';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'donors', element: <DonorListPage /> },
      { path: 'donors/new', element: <DonorFormPage /> },
      { path: 'donors/:id', element: <DonorDetailsPage /> },
      { path: 'donors/:id/edit', element: <DonorFormPage /> },
      { path: 'requests', element: <RequestListPage /> },
      { path: 'requests/new', element: <RequestFormPage /> },
      { path: 'requests/:id', element: <RequestDetailsPage /> },
    ],
  },
]);

const root = document.getElementById('root');
if (!root) throw new Error('The #root element is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
