// components/AuthForm.tsx
// 로그인 폼 컴포넌트
"use client";
import React, { useState } from "react";
import { inputBox, btnPrimary } from "../styles"; // 스타일 import

interface AuthFormProps {
  onSignIn: (email: string, password: string) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    onSignIn(email, password);
  };

  return (
    <>
      <input
        type="email"
        placeholder="아이디 (이메일)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputBox}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputBox}
      />

      <button onClick={handleSubmit} style={btnPrimary}>
        로그인
      </button>
    </>
  );
};

export default AuthForm;