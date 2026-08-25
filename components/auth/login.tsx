"use client";
import { createClient } from "@/utils/supabase/client";
import { LoginSchema } from "@/helpers/schemas";
import { LoginFormType } from "@/helpers/types";
import { Button, Input } from "@nextui-org/react";
import { Formik, ErrorMessage } from "formik";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const supabase = createClient();

export const Login = () => {
  const router = useRouter();

  const initialValues: LoginFormType = {
    email: "",
    password: "",
  };

  const errors: Record<string, boolean> = {};
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = useCallback(
    async (values: LoginFormType) => {
      // `values` contains email & password. You can use provider to connect user
      setIsLoading(true);
      let { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      })

      if (error) {
        setErrorMessage("Credenciales incorrectas. Por favor, intenta de nuevo.");
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      if (data.user) {
        setErrorMessage("");
        setIsLoading(false);
        setIsAuthenticated(true);
        router.replace("/");
        router.refresh();
      }
    },
    [router]
  );
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalContentStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '5px',
    textAlign: 'center',
    color: 'black'
  };
  return (
    <>
      <div className='text-center text-[25px] font-bold mb-6'>Iniciar Sesión</div>

      <Formik
        initialValues={initialValues}
        validationSchema={LoginSchema}
        onSubmit={handleLogin}>
        {({ values, errors, touched, handleChange, handleSubmit }) => (
          <>
            <div className='flex flex-col w-1/2 gap-4 mb-4'>
              <Input
                variant='bordered'
                label='Correo Electónico'
                type='email'
                value={values.email}
                isInvalid={!!errors.email && !!touched.email}
                errorMessage={errors.email}
                onChange={handleChange("email")}
              />
              <Input
                variant='bordered'
                label='Contraseña'
                type='password'
                value={values.password}
                isInvalid={!!errors.password && !!touched.password}
                errorMessage={errors.password}
                onChange={handleChange("password")}
              />
            </div>
            {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
            <Button
              onPress={() => handleSubmit()}
              variant='flat'
              color='primary'>
              Ingresar
            </Button>

            {isLoading && (
              <div style={modalOverlayStyle}>
                <div style={modalContentStyle}>
                  <div className="loader"></div>
                </div>
              </div>
            )}
          </>
        )}
      </Formik>
    </>
  );
};
