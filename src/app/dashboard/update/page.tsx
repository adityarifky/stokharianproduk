import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function UpdatePage() {
  return (
    <div className="flex justify-center items-start h-full">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Update Produk</CardTitle>
          <CardDescription>
            Fitur untuk menambah atau mengubah produk akan segera tersedia di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Nantikan pembaruan selanjutnya!</p>
        </CardContent>
      </Card>
    </div>
  );
}
