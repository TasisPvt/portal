import { LoginForm } from "@/src/app/(auth)/login/_components/login-form"
import Logo from "@/src/components/logo"

function page() {
    return (
        <div className="flex min-h-screen">
            <div className="flex flex-1 flex-col justify-between p-8 lg:p-12">
                <Logo />

                <LoginForm />

                <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
                    <span>Copyright ©{new Date().getFullYear()} Tasis Pvt Ltd.</span>
                </div>
            </div>

            <div className="hidden flex-1 flex-col justify-center bg-primary p-12 lg:flex xl:p-16 m-8 rounded-2xl">
                <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
                    <h2
                        className="mb-4 text-4xl font-bold leading-tight text-primary-foreground xl:text-5xl animate-float"
                        style={{ animationDelay: "0.6s" }}
                    >
                        Effortlessly manage your team and operations.
                    </h2>
                    <p className="mb-10 text-lg text-white">
                        Log in to access your CRM dashboard and manage your team.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default page