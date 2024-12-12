import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" className="blog w-30 overflow-hidden">
      <h1 className="font-bold text-xl bg-muted w-[100px] flex">
        <span>&nbsp;&nbsp;</span>
        <span className="text-background bg-foreground">
          &nbsp;ZLSOFT&nbsp;
        </span>
      </h1>
    </Link>
  )
}
