import { useDropzone } from 'react-dropzone';

export default function Uploader({ onUpload }: { onUpload: (text: string) => void }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'text/plain': ['.txt']
        },
        onDrop: files => {
            const reader = new FileReader();
            reader.onload = () => onUpload(reader.result as string);
            reader.readAsText(files[0]);
        }
    });

    return (
        <div
            {...getRootProps()}
            className={`p-8 mb-4 border-2 border-dashed rounded-lg text-center cursor-pointer 
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
        >
            <input {...getInputProps()} />
            <p className="text-gray-600">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a .txt file, or click to select'}
            </p>
        </div>
    );
}
