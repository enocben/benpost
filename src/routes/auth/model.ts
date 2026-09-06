import { t, type UnwrapSchema } from 'elysia'

export const AuthModel = {
	register: t.Object({
    name: t.String({
      maxLength: 100,
      minLength: 3
    }),
		email: t.String(),
		password: t.String({
      minLength: 8,
      maxLength: 50
    }),
	}),
	login: t.Object({
		email: t.String(),
		password: t.String(),
	}),
	loginInvalid: t.Literal('Invalid email or password'),
  registerInvalid: t.Literal('This user is already exist')
} as const

// Optional, cast all model to TypeScript type
export type AuthModel = {
	[k in keyof typeof AuthModel]: UnwrapSchema<typeof AuthModel[k]>
}
