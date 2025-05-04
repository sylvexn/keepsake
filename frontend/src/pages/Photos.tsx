import React, { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import MainLayout from "../layouts/MainLayout";

interface Image {
  id: number;
  original_filename: string;
  saved_filename: string;
  url: string;
  file_extension: string;
  file_size: number;
  upload_timestamp: string;
}

interface ImagesResponse {
  images: Image[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const Photos = () => {
  // State for images and pagination
  const [imagesData, setImagesData] = useState<ImagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for filters
  const [filters, setFilters] = useState({
    filename: "",
    file_extension: "",
    date_from: "",
    date_to: "",
    sort_by: "upload_timestamp",
    sort_order: "DESC"
  });
  
  // State for modal
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch images with current filters and pagination
  const fetchImages = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "20",
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        )
      });

      const response = await fetch(`/api/images?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }
      
      const data = await response.json();
      setImagesData(data);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch images when page or filters change
  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  // Apply filters
  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchImages();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      filename: "",
      file_extension: "",
      date_from: "",
      date_to: "",
      sort_by: "upload_timestamp",
      sort_order: "DESC"
    });
    setCurrentPage(1);
    fetchImages();
  };

  // Open modal to view image
  const openImageModal = (image: Image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  // Copy URL to clipboard
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        // Could show toast notification here
        console.log("URL copied to clipboard");
      })
      .catch(err => {
        console.error("Failed to copy URL: ", err);
      });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Photos Gallery</h1>
        
        {/* Filters */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Filename</label>
              <Input
                type="text"
                value={filters.filename}
                onChange={(e) => setFilters({...filters, filename: e.target.value})}
                placeholder="Search by filename"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File Type</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.file_extension}
                onChange={(e) => setFilters({...filters, file_extension: e.target.value})}
              >
                <option value="">All Types</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="jpeg">JPEG</option>
                <option value="gif">GIF</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort By</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.sort_by}
                onChange={(e) => setFilters({...filters, sort_by: e.target.value})}
              >
                <option value="upload_timestamp">Upload Date</option>
                <option value="file_size">File Size</option>
                <option value="original_filename">Filename</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={filters.sort_order}
                onChange={(e) => setFilters({...filters, sort_order: e.target.value})}
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </div>
            <div className="flex items-end space-x-2 col-span-1 md:col-span-2 lg:col-span-3">
              <Button type="submit">Apply Filters</Button>
              <Button type="button" variant="ghost" onClick={resetFilters}>Reset</Button>
            </div>
          </form>
        </Card>
        
        {/* Gallery */}
        {loading ? (
          <div className="flex justify-center my-12">
            <span className="loading">Loading images...</span>
          </div>
        ) : (
          <>
            {imagesData?.images.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">No images found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {imagesData?.images.map((image) => (
                  <Card key={image.id} className="overflow-hidden">
                    <div 
                      className="h-48 bg-gray-100 cursor-pointer"
                      onClick={() => openImageModal(image)}
                    >
                      <img 
                        src={image.url} 
                        alt={image.original_filename || image.saved_filename} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-4">
                      <div className="truncate text-sm font-medium">
                        {image.original_filename || image.saved_filename}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(image.file_size)}</span>
                        <span>{new Date(image.upload_timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => copyToClipboard(image.url)}
                        >
                          Copy URL
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => window.open(image.url, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {imagesData && imagesData.total_pages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex space-x-1">
                  {Array.from({ length: imagesData.total_pages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card hover:bg-muted'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Image Modal */}
        {selectedImage && (
          <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isModalOpen ? '' : 'hidden'}`}>
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold truncate">
                  {selectedImage.original_filename || selectedImage.saved_filename}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.original_filename || selectedImage.saved_filename}
                  className="mx-auto max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Size:</span> {formatFileSize(selectedImage.file_size)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedImage.file_extension}
                  </div>
                  <div>
                    <span className="font-medium">Uploaded:</span> {formatDate(selectedImage.upload_timestamp)}
                  </div>
                  <div>
                    <span className="font-medium">URL:</span>{" "}
                    <span className="text-xs truncate">{selectedImage.url}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                  <Button 
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedImage.url)}
                  >
                    Copy URL
                  </Button>
                  <Button onClick={() => setIsModalOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Photos; 