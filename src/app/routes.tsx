import { createBrowserRouter } from "react-router";
import RootLayout from "./components/RootLayout";
import SplashPage from "./pages/SplashPage";
import Home from "./pages/Home";
import Activities from "./pages/Activities";
import Profile from "./pages/Profile";
import Store from "./pages/Store";
import CleanAndEarn from "./pages/CleanAndEarn";
import CategoryDetail from "./pages/CategoryDetail";
import PostItem from "./pages/PostItem";
import Chat from "./pages/Chat";
import ChooseLocation from "./pages/ChooseLocation";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EditProfile from "./pages/EditProfile";
import VerifyOTP from "./pages/VerifyOTP";
import VerifyPending from "./pages/VerifyPending";
import VerifyIdentity from "./pages/VerifyIdentity";
import Notifications from "./pages/Notifications";
import Leftovers from "./pages/Leftovers";
import NotFound from "./pages/NotFound";
import GoogleCallback from "./pages/GoogleCallback";
import HelpCenter from "./pages/HelpCenter";
import MyListings from "./pages/MyListings";
import MyImpact from "./pages/MyImpact";
import MyBadges from "./pages/MyBadges";
import About from "./pages/About";
import Terms from "./pages/Terms";

let _router: ReturnType<typeof createBrowserRouter> | null = null;

export function getRouter() {
  if (!_router) {
    _router = createBrowserRouter([
      {
        path: "/",
        Component: RootLayout,
        children: [
          {
            index: true,
            Component: SplashPage,
          },
          {
            path: "login",
            Component: Login,
          },
          {
            path: "signup",
            Component: Signup,
          },
          {
            path: "verify-otp",
            Component: VerifyOTP,
          },
          {
            path: "verify-pending",
            Component: VerifyPending,
          },
          {
            path: "verify-identity",
            Component: VerifyIdentity,
          },
          {
            path: "home",
            Component: Home,
          },
          {
            path: "activities",
            Component: Activities,
          },
          {
            path: "clean-earn",
            Component: CleanAndEarn,
          },
          {
            path: "store",
            Component: Store,
          },
          {
            path: "profile",
            Component: Profile,
          },
          {
            path: "edit-profile",
            Component: EditProfile,
          },
          {
            path: "notifications",
            Component: Notifications,
          },
          {
            path: "leftovers",
            Component: Leftovers,
          },
          {
            path: "category/:categoryId",
            Component: CategoryDetail,
          },
          {
            path: "post-item/:categoryId",
            Component: PostItem,
          },
          {
            path: "chat/:chatId",
            Component: Chat,
          },
          {
            path: "choose-location",
            Component: ChooseLocation,
          },
          {
            path: "auth/google/callback",
            Component: GoogleCallback,
          },
          {
            path: "help-center",
            Component: HelpCenter,
          },
          {
            path: "my-listings",
            Component: MyListings,
          },
          {
            path: "my-impact",
            Component: MyImpact,
          },
          {
            path: "my-badges",
            Component: MyBadges,
          },
          {
            path: "about",
            Component: About,
          },
          {
            path: "terms",
            Component: Terms,
          },
          {
            path: "*",
            Component: NotFound,
          },
        ],
      },
    ]);
  }
  return _router;
}
