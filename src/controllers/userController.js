import User from "../models/User";
import Video from "../models/Video";
import bcrypt from "bcrypt";
import fetch from "node-fetch";

export const getJoin = (req, res) => {
  res.render("join", { pageTitle: "Create Account" });
};

// ToDo : Error Message를 실시간으로 볼 수 있도록 하기 (새로고침 없이)
export const postJoin = async (req, res) => {
  const pageTitle = "Create Account";
  const { email, password, password2, username } = req.body;
  if (password !== password2) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "패스워드가 일치하지 않습니다.",
    });
  }
  const exists = await User.exists({ $or: [{ email }, { username }] });
  if (exists) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "This email/username is already taken",
    });
  }
  try {
    await User.create({
      email: email,
      password: password,
      username: username,
      socialId: false,
    });
    req.flash("info", "가입이 완료되었습니다. 환영합니다!");
    return res.redirect("/login");
  } catch (error) {
    console.log(error);
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: error._message,
    });
  }
};

// login
export const getLogin = (req, res) => {
  res.render("login", { pageTitle: "Login" });
};

export const postLogin = async (req, res) => {
  const pageTitle = "Login";
  const { username, password } = req.body;
  const user = await User.findOne({ username }).populate("groups"); // username: req.body.username, username: username 과 동일
  if (!user) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "The Username does not exist",
    });
  }
  if (user.socialId === true) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage:
        "This Account is social account. Please login with Social login",
    });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "Wrong Password",
    });
  }
  req.session.loggedIn = true;
  req.session.loggedInUser = user;
  req.flash("info", "로그인 성공");
  res.redirect("/");
};

// Github OAuth
export const startGithubLogin = (req, res) => {
  const baseURL = "https://github.com/login/oauth/authorize";
  const config = {
    client_id: process.env.GITHUB_CLIENT,
    scope: "read:user user:email",
  };
  const params = new URLSearchParams(config).toString();
  const URL = `${baseURL}?${params}`;
  return res.redirect(URL);
};

export const finishGithubLogin = async (req, res) => {
  const baseURL = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GITHUB_CLIENT,
    client_secret: process.env.GITHUB_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const URL = `${baseURL}?${params}`;
  const tokenRequest = await (
    await fetch(URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    const APIURL = "https://api.github.com";
    const userData = await (
      await fetch(`${APIURL}/user`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();
    const userEmails = await (
      await fetch(`${APIURL}/user/emails`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();
    const userEmailObj = userEmails.find(
      (email) => email.primary === true && email.verified === true
    );
    if (!userEmailObj) {
      return res.redirect("/login"); // ToDo : notification error (깃허브 계정에 이메일 없음)
    }
    let user = await User.findOne({ email: userEmailObj.email }).populate(
      "groups"
    );
    if (!user) {
      user = await User.create({
        email: userEmailObj.email,
        password: "",
        username: userData.login,
        avatarUrl: userData.avatar_url,
        socialId: true,
      });
    }
    req.session.loggedIn = true;
    req.session.loggedInUser = user;
  } else {
    req.flash("error", "Github 로그인에 실패하였습니다.");
    return res.redirect("/login"); // ToDo : notification error (깃허브 인증 실패)
  }
  req.flash("info", "로그인 성공");
  return res.redirect("/");
};

// show User
export const userProfile = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate({
      path: "videos",
      populate: {
        path: "owner",
      },
    })
    .populate({
      path: "groups",
      populate: {
        path: "videos",
        populate: {
          path: "owner",
        },
      },
    });
  if (!user) {
    return res.status(404).render("404");
  }
  return res.render("users/profile", {
    pageTitle: `${user.username}의 프로필`,
    user,
  });
};

// edit User
export const getEditUser = (req, res) => {
  return res.render("users/edit-profile", { pageTitle: "Edit Profile" });
};

export const postEditUser = async (req, res) => {
  const {
    session: {
      loggedInUser: { _id, avatarUrl },
    },
    body: { username, location },
    file,
  } = req;
  const isHeroku = process.env.NODE_ENV === "production";
  let changed = false;
  if (username !== req.session.loggedInUser.username) {
    changed = true;
  }
  const exist = await User.exists({ username });
  if (exist && changed) {
    return res.status(400).render("users/edit-profile", {
      pageTitle: "Edit Profile",
      errorMessage: "This Username already taken",
    });
  }
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    {
      avatarUrl: file
        ? isHeroku
          ? `${file.location}`
          : `/${file.path}`
        : avatarUrl,
      username,
    },
    { new: true }
  ).populate("groups");
  req.session.loggedInUser = updatedUser;
  req.flash("info", "수정이 완료되었습니다.");
  return res.redirect("/users/edit");
};

// change password
export const getChangePassword = (req, res) => {
  if (req.session.loggedInUser.socialId === true) {
    req.flash("error", "소셜 유저는 비밀번호를 설정할 수 없습니다");
    return res.redirect("/");
  }
  return res.render("users/change-password", { pageTitle: "Change Password" });
};

export const postChangePassword = async (req, res) => {
  const pageTitle = "Change Password";
  const { currentPassword, newPassword, newPassword2 } = req.body;
  const user = await User.findById(req.session.loggedInUser._id);
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return res.status(400).render("users/change-password", {
      pageTitle,
      errorMessage: "입력한 비밀번호가 틀렸습니다.",
    });
  }
  if (newPassword !== newPassword2) {
    return res.status(400).render("users/change-password", {
      pageTitle,
      errorMessage: "두 비밀번호가 일치하지 않습니다. 정확히 입력해주세요.",
    });
  }
  user.password = newPassword;
  await user.save();
  req.session.loggedInUser.password = user.password;
  req.flash("info", "비밀번호가 변경되었습니다. 다시 로그인해주세요");
  return res.redirect("/logout");
};

// logout
export const logout = (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/"); // ToDo 에러메세지
  } else {
    req.session.loggedIn = false;
    req.session.loggedInUser = null;
  }
  req.flash("info", "로그아웃 되었습니다.");
  return res.redirect("/");
};
