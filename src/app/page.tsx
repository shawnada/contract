// import Image from "next/image";
import { Button } from '@/components/ui/button'
import { Code } from 'lucide-react'
import HomeNav from '@/components/HomeNav'
import Slogan from '@/components/Slogan'
import StartButton from './start-button'

export default async function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-center text-center">
      <HomeNav />
      <h2 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
        <span className="font-extrabold">文本审核系统（测试版）</span>
      </h2>
      <Slogan />
      <section className="mt-10 flex justify-center space-x-4">
        <StartButton />
      </section>
    </main>
  )
}
