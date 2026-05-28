import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(108,99,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(108,99,255,0.07)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Clerk SignIn component */}
      <SignIn />
    </div>
  );
}