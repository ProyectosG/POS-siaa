"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon } from "lucide-react"

export default function TabImagen({ imagePreview, onSelect, onRemove }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <ImageIcon className="w-5 h-5 text-cyan-500" /> Imagen
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full overflow-hidden border">
          {imagePreview ? (
            <img src={imagePreview} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-full h-full text-muted-foreground" />
          )}
        </div>

        <label className="cursor-pointer">
          <Upload className="inline mr-2" /> Subir imagen
          <input type="file" hidden accept="image/*" onChange={onSelect} />
        </label>

        {imagePreview && (
          <Button variant="outline" onClick={onRemove}>
            Eliminar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
