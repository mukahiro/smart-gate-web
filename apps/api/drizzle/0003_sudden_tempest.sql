ALTER TABLE `users`
ADD COLUMN `face_image_count` integer DEFAULT 0 NOT NULL
CONSTRAINT `users_face_image_count_check`
CHECK (`face_image_count` BETWEEN 0 AND 10);
