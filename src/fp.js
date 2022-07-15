import S from 'sanctuary'

export const predTrue = () => true

export const safeProp = S.get(predTrue)

export const safeProps = S.gets(predTrue)
