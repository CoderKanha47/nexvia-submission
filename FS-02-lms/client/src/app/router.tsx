import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Courses from '../pages/Courses';
import CourseDetail from '../pages/CourseDetail';
import Login from '../pages/Login';
import Register from '../pages/Register';
import MyLearning from '../pages/MyLearning';
import Learn from '../pages/Learn';
import LiveClass from '../pages/LiveClass';
import Quiz from '../pages/Quiz';
import Certificates from '../pages/Certificates';
import VerifyCertificate from '../pages/VerifyCertificate';
import InstructorDashboard from '../pages/InstructorDashboard';
import InstructorCourseEdit from '../pages/InstructorCourseEdit';
import InstructorEarnings from '../pages/InstructorEarnings';
import InstructorCourses from '../pages/InstructorCourses';
import Admin from '../pages/Admin';
import AdminUsers from '../pages/AdminUsers';
import AdminCourses from '../pages/AdminCourses';
import { StudentOnlyRoute, InstructorRoute, AdminRoute } from '../components/auth/RoleRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'courses', element: <Courses /> },
      { path: 'courses/:slug', element: <CourseDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'my-learning',
        element: (
          <StudentOnlyRoute>
            <MyLearning />
          </StudentOnlyRoute>
        ),
      },
      {
        path: 'certificates',
        element: (
          <StudentOnlyRoute>
            <Certificates />
          </StudentOnlyRoute>
        ),
      },
      {
        path: 'learn/:courseId',
        element: (
          <StudentOnlyRoute>
            <Learn />
          </StudentOnlyRoute>
        ),
      },
      {
        path: 'live/:liveClassId',
        element: (
          <StudentOnlyRoute>
            <LiveClass />
          </StudentOnlyRoute>
        ),
      },
      {
        path: 'quiz/:quizId',
        element: (
          <StudentOnlyRoute>
            <Quiz />
          </StudentOnlyRoute>
        ),
      },
      { path: 'verify/:certificateId', element: <VerifyCertificate /> },
      {
        path: 'instructor',
        element: (
          <InstructorRoute>
            <InstructorDashboard />
          </InstructorRoute>
        ),
      },
      {
        path: 'instructor/dashboard',
        element: (
          <InstructorRoute>
            <InstructorDashboard />
          </InstructorRoute>
        ),
      },
      {
        path: 'instructor/courses',
        element: (
          <InstructorRoute>
            <InstructorCourses />
          </InstructorRoute>
        ),
      },
      {
        path: 'instructor/courses/new',
        element: (
          <InstructorRoute>
            <InstructorCourseEdit />
          </InstructorRoute>
        ),
      },
      {
        path: 'instructor/courses/:id/edit',
        element: (
          <InstructorRoute>
            <InstructorCourseEdit />
          </InstructorRoute>
        ),
      },
      {
        path: 'instructor/earnings',
        element: (
          <InstructorRoute>
            <InstructorEarnings />
          </InstructorRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/courses',
        element: (
          <AdminRoute>
            <AdminCourses />
          </AdminRoute>
        ),
      },
    ],
  },
]);