import React from 'react'
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated, isTokenExpired } from "../utils/authStorage";

const PrivateRoute = () => {
  const location = useLocation();

  // Check if user is authenticated and token is not expired
  const isAuth = isAuthenticated();
  const tokenExpired = isTokenExpired();

  if (!isAuth || tokenExpired) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

export default PrivateRoute;
