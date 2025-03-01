// Low effort page cause its 11:44 💀

export default async function alichapman() {
  return (
		<div className="relative min-h-screen bg-gradient-to-b from-purple-900 to-[#0F172A]">
      <div className='flex items-center align-center h-screen flex-col'>
        <div className='flex'>
          <a target='_blank' href='https://github.com/Alitech3' rel="noreferrer" className='text-5xl m-3'>Github</a>
          <a target='_blank' href='https://www.linkedin.com/in/ali-chapman-ajlc/' rel="noreferrer" className='text-5xl m-3'>Linkedin</a>
          <a target='_blank' href='https://alichapman.dev/' rel="noreferrer" className='text-5xl m-3'>Portfolio</a>
        </div>
        <iframe src={"/Ali Chapman Resume.pdf#zoom=FitH&zoom=70"} className='h-full' width={575}/>
      </div>
    </div>
  );
}
