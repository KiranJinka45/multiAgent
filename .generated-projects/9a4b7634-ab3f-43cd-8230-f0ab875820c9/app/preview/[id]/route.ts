/* route.ts */
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const PreviewRegistry = dynamic(() => import('@/runtime/preview-registry'), {
  ssr: false,
});

export default function Route() {
  const router = useRouter();
  const id = router.query.id;

  return (
    <div>
      <h1>Preview {id}</h1>
      <PreviewRegistry id={id} />
    </div>
  );
}